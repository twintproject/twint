import twint

c =twint.Config()
c.Username = 'noneprivacy'
c.Output = 'rawme'
c.Limit = 20
twint.run.Search(c)
